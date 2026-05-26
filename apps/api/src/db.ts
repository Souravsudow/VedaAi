import mongoose from "mongoose";

export async function connectDb() {
  const uri = process.env.MONGO_URL || "mongodb://localhost:27017/vedaai_assessment_studio";
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
}
