import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const router = Router();

const VALID_STATUSES = [
  "Wishlist",
  "Applied",
  "Phone Screen",
  "Technical Interview",
  "Final Round",
  "Offer",
  "Rejected",
  "Withdrawn",
];

// GET /api/applications
// Returns all applications for a user. Supports optional ?status= filter.
router.get("/", async (req, res) => {
  try {
    const { userId, status } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ error: "userId query parameter is required." });
    }

    const db = getDB();
    const applications = db.collection("applications");

    const query = { userId };
    if (status && VALID_STATUSES.includes(status)) {
      query.status = status;
    }

    const docs = await applications
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();
    return res.status(200).json(docs);
  } catch (err) {
    console.error("GET /applications error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// GET /api/applications/metrics
// Returns aggregate metrics for dashboard stats display.
router.get("/metrics", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ error: "userId query parameter is required." });
    }

    const db = getDB();
    const applications = db.collection("applications");

    const pipeline = [
      { $match: { userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ];

    const byStatus = await applications.aggregate(pipeline).toArray();

    const total = await applications.countDocuments({ userId });
    const offers = byStatus.find((s) => s._id === "Offer")?.count ?? 0;
    const interviews = byStatus
      .filter((s) =>
        ["Phone Screen", "Technical Interview", "Final Round"].includes(s._id)
      )
      .reduce((acc, s) => acc + s.count, 0);
    const rejected = byStatus.find((s) => s._id === "Rejected")?.count ?? 0;

    // Response rate = applications that got a reply / applications actually submitted
    const RESPONDED_STATUSES = [
      "Phone Screen",
      "Technical Interview",
      "Final Round",
      "Offer",
      "Rejected",
    ];
    const responded = byStatus
      .filter((s) => RESPONDED_STATUSES.includes(s._id))
      .reduce((acc, s) => acc + s.count, 0);
    const submitted = byStatus
      .filter((s) => !["Wishlist", "Withdrawn"].includes(s._id))
      .reduce((acc, s) => acc + s.count, 0);

    return res.status(200).json({
      total,
      offers,
      interviews,
      rejected,
      responseRate:
        submitted > 0 ? Math.round((responded / submitted) * 100) : 0,
      byStatus,
    });
  } catch (err) {
    console.error("GET /applications/metrics error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// GET /api/applications/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid application ID." });
    }

    const db = getDB();
    const applications = db.collection("applications");
    const doc = await applications.findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return res.status(404).json({ error: "Application not found." });
    }

    return res.status(200).json(doc);
  } catch (err) {
    console.error("GET /applications/:id error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// POST /api/applications
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      company,
      role,
      salary,
      status,
      jobLink,
      notes,
      appliedDate,
    } = req.body;

    if (!userId || !company || !role) {
      return res
        .status(400)
        .json({ error: "userId, company, and role are required." });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const db = getDB();
    const applications = db.collection("applications");

    const newApp = {
      userId,
      company: company.trim(),
      role: role.trim(),
      salary: salary ? salary.trim() : "",
      status: status || "Wishlist",
      jobLink: jobLink ? jobLink.trim() : "",
      notes: notes ? notes.trim() : "",
      appliedDate: appliedDate ? new Date(appliedDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await applications.insertOne(newApp);
    return res.status(201).json({ ...newApp, _id: result.insertedId });
  } catch (err) {
    console.error("POST /applications error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// PUT /api/applications/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid application ID." });
    }

    const { company, role, salary, status, jobLink, notes, appliedDate } =
      req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const updateFields = { updatedAt: new Date() };
    if (company !== undefined) updateFields.company = company.trim();
    if (role !== undefined) updateFields.role = role.trim();
    if (salary !== undefined) updateFields.salary = salary.trim();
    if (status !== undefined) updateFields.status = status;
    if (jobLink !== undefined) updateFields.jobLink = jobLink.trim();
    if (notes !== undefined) updateFields.notes = notes.trim();
    if (appliedDate !== undefined)
      updateFields.appliedDate = appliedDate ? new Date(appliedDate) : null;

    const db = getDB();
    const applications = db.collection("applications");

    const result = await applications.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ error: "Application not found." });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("PUT /applications/:id error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// DELETE /api/applications/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid application ID." });
    }

    const db = getDB();
    const applications = db.collection("applications");

    const result = await applications.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Application not found." });
    }

    return res
      .status(200)
      .json({ message: "Application deleted successfully." });
  } catch (err) {
    console.error("DELETE /applications/:id error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
