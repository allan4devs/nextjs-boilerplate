import { getDb } from "@/lib/helpers/mongodb";
import { QR_GROUPS } from "./qr-groups";

export async function getPublicQrGroups() {
  try {
    const db = await getDb();
    const saved = await db.collection("xtreme_gym_qr_groups").find({ id: { $in: QR_GROUPS.map(group => group.id) } }, { projection: { _id: 0, id: 1, name: 1, code: 1 } }).toArray();
    return QR_GROUPS.map(group => {
      const row = saved.find(item => item.id === group.id);
      return { ...group, ...(typeof row?.name === "string" ? { name: row.name } : {}), ...(typeof row?.code === "string" && row.code ? { code: row.code } : {}) };
    });
  } catch {
    return QR_GROUPS;
  }
}
