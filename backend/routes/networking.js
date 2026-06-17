import { Router } from "express";
import { getDB } from "../config/db.js";
import {
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from "../db/networking.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const {
      search,
      page = "1",
      limit = "20",
      sortBy = "followUpDate",
      sortDir = "asc",
    } = req.query;

    const db = getDB();
    const contacts = db.collection("networking");

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const SORTABLE_FIELDS = [
      "name",
      "company",
      "role",
      "lastContact",
      "followUpDate",
    ];
    const sortField = SORTABLE_FIELDS.includes(sortBy)
      ? sortBy
      : "followUpDate";
    const sortOrder = sortDir === "asc" ? 1 : -1;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [docs, total, statsTotal, statsFollowupDue, statsRecentThisMonth] =
      await Promise.all([
        contacts
          .find(filter)
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum)
          .toArray(),
        contacts.countDocuments(filter),
        contacts.countDocuments({}),
        contacts.countDocuments({
          followUpDate: { $ne: null, $lt: now },
        }),
        contacts.countDocuments({
          lastContact: { $gte: startOfMonth, $lt: startOfNextMonth },
        }),
      ]);

    return res.status(200).json({
      data: docs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      stats: {
        total: statsTotal,
        followupDue: statsFollowupDue,
        recentThisMonth: statsRecentThisMonth,
      },
    });
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const contact = await getContactById(req.params.id);
    if (!contact) return res.status(404).json({ error: "Not found" });
    res.json(contact);
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, company } = req.body;
    if (!name || !company) {
      return res.status(400).json({ error: "name and company are required" });
    }
    const created = await createContact(req.body);
    res.status(201).json(created);
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to create contact" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updated = await updateContact(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to update contact" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await deleteContact(req.params.id);
    if (result.deletedCount === 0)
      return res.status(404).json({ error: "Not found" });
    res.json({ message: "Contact deleted" });
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

export default router;
