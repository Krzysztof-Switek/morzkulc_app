// public/modules/raporty/registry.js
// Rejestr raportów Zarządu. Dodanie raportu = import deskryptora + wpis w REPORTS.
import { gearRentalsReport } from "./gear_rentals.js";
import { topRentalsReport } from "./top_rentals.js";
import { memberActivityReport } from "./member_activity.js";
import { memberDuesReport } from "./member_dues.js";
import { userActivityReport } from "./user_activity.js";

export const REPORTS = [
  gearRentalsReport,
  topRentalsReport,
  memberActivityReport,
  memberDuesReport,
  userActivityReport,
];
