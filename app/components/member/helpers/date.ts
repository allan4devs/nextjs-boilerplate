import { businessDate } from "@/lib/xtreme/business-date";

export function todayIso() {
  return businessDate();
}

export function getWeekDates() {
  const today = new Date(`${businessDate()}T12:00:00-06:00`);
  const day = today.getUTCDay() || 7;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - day + 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function dayLabel(date: string) {
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const index = getWeekDates().indexOf(date);
  return labels[index] ?? "";
}
