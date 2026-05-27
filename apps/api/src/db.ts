import mongoose from "mongoose";

export async function connectDb() {
  const uri = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/vedaai_assessment_studio";
  // ^ localhost ki jagah 127.0.0.1 use karo
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
}