import { Router } from "express";
import { getDB } from "../config/db.js";
import {
  getInterviewById,
  createInterview,
  updateInterview,
  deleteInterview,
} from "../db/interviews.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const {
      status,
      search,
      page = "1",
      limit = "20",
      sortBy = "date",
      sortDir = "desc",
    } = req.query;

    const db = getDB();
    const interviews = db.collection("interviews");

    const VALID_STATUSES = ["Upcoming", "Completed", "Cancelled"];
    const filter = {};
    if (status && VALID_STATUSES.includes(status)) filter.status = status;
    if (search) {
      filter.$or = [
        { company: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const SORTABLE_FIELDS = [
      "company",
      "role",
      "round",
      "status",
      "date",
      "result",
    ];
    const sortField = SORTABLE_FIELDS.includes(sortBy) ? sortBy : "date";
    const sortOrder = sortDir === "asc" ? 1 : -1;

    const [docs, total] = await Promise.all([
      interviews
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      interviews.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: docs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch interviews" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const interview = await getInterviewById(req.params.id);
    if (!interview) return res.status(404).json({ error: "Not found" });
    res.json(interview);
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch interview" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { company, role, round } = req.body;
    if (!company || !role || !round) {
      return res
        .status(400)
        .json({ error: "company, role, and round are required" });
    }
    const created = await createInterview(req.body);
    res.status(201).json(created);
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to create interview" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updated = await updateInterview(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to update interview" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await deleteInterview(req.params.id);
    if (result.deletedCount === 0)
      return res.status(404).json({ error: "Not found" });
    res.json({ message: "Interview deleted" });
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to delete interview" });
  }
});

export default router;
