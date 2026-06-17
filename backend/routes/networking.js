import { Router } from "express";
import {
  getAllContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from "../db/networking.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const contacts = await getAllContacts();
    res.json(contacts);
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
