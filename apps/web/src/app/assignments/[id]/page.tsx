import { AssignmentDetail } from "./view";

export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentDetail id={id} />;
}
