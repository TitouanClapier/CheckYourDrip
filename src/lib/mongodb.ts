import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGO_URI!;
const dbName = process.env.MONGO_DB || "db-CheckYourDrip";

let client: MongoClient | null = null;

async function getClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await client.connect();
  }
  return client;
}

export async function getMongoDb() {
  const c = await getClient();
  return c.db(dbName);
}

export type MongoLog = {
  _id: string;
  dateLog: string;
  photo: string;
  verification: boolean;
  objectClass: string;
};

/** Normalise le champ photo : URL complète ou simple filename → URL Cloudinary */
function normalizePhotoUrl(photo: unknown): string | null {
  if (!photo || typeof photo !== "string") return null;
  if (photo.startsWith("http")) return photo;
  // Le Python a stocké uniquement le filename — on reconstruit l'URL Cloudinary
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud) return null;
  return `https://res.cloudinary.com/${cloud}/image/upload/checkyourdrip/detections/${photo}`;
}

/** Fetch multiple logs by their ObjectId strings */
export async function getLogsByIds(
  ids: string[]
): Promise<Record<string, MongoLog>> {
  if (!ids.length) return {};

  try {
    const db = await getMongoDb();
    const objectIds = ids.map((id) => new ObjectId(id));
    const docs = await db
      .collection("Logs")
      .find({ _id: { $in: objectIds } })
      .toArray();

    return Object.fromEntries(
      docs.map((doc) => [
        doc._id.toString(),
        { ...(doc as unknown as MongoLog), photo: normalizePhotoUrl(doc.photo) ?? "" },
      ])
    );
  } catch {
    return {};
  }
}

/** Update verification status of a log */
export async function updateLogVerification(
  id: string,
  verification: boolean
): Promise<void> {
  const db = await getMongoDb();
  await db
    .collection("Logs")
    .updateOne({ _id: new ObjectId(id) }, { $set: { verification } });
}
