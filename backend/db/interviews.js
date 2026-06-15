import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

const COLLECTION = 'interviews';

export async function getAllInterviews() {
  const db = getDB();
  return db.collection(COLLECTION).find({}).sort({ date: 1 }).toArray();
}

export async function getInterviewById(id) {
  const db = getDB();
  return db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
}

export async function createInterview(data) {
  const db = getDB();
  const doc = {
    company: data.company,
    role: data.role,
    round: data.round,
    date: data.date ? new Date(data.date) : null,
    status: data.status || 'Upcoming',
    interviewerName: data.interviewerName || '',
    techNotes: data.techNotes || '',
    behavioralNotes: data.behavioralNotes || '',
    result: data.result || 'Pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await db.collection(COLLECTION).insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function updateInterview(id, data) {
  const db = getDB();
  const updates = { ...data, updatedAt: new Date() };
  if (data.date) updates.date = new Date(data.date);
  delete updates._id;
  await db
    .collection(COLLECTION)
    .updateOne({ _id: new ObjectId(id) }, { $set: updates });
  return getInterviewById(id);
}

export async function deleteInterview(id) {
  const db = getDB();
  return db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
}
