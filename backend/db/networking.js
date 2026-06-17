import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

const COLLECTION = 'networking';

export async function getAllContacts(filter = {}) {
  const db = getDB();
  return db.collection(COLLECTION).find(filter).sort({ followUpDate: 1 }).toArray();
}

export async function getContactById(id) {
  const db = getDB();
  return db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
}

export async function createContact(data) {
  const db = getDB();
  const doc = {
    name: data.name,
    company: data.company,
    role: data.role || '',
    email: data.email || '',
    linkedin: data.linkedin || '',
    phone: data.phone || '',
    applicationId: data.applicationId || null,
    lastContact: data.lastContact ? new Date(data.lastContact) : null,
    followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
    notes: data.notes || '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await db.collection(COLLECTION).insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function updateContact(id, data) {
  const db = getDB();
  const updates = { ...data, updatedAt: new Date() };
  if (data.lastContact) updates.lastContact = new Date(data.lastContact);
  if (data.followUpDate) updates.followUpDate = new Date(data.followUpDate);
  delete updates._id;
  await db
    .collection(COLLECTION)
    .updateOne({ _id: new ObjectId(id) }, { $set: updates });
  return getContactById(id);
}

export async function deleteContact(id) {
  const db = getDB();
  return db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
}
