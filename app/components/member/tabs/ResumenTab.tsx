"use client";

import type {
  ResumenActions,
  ResumenViewModel,
} from "../view-models/useResumenViewModel";
import { MemberHomeDashboard } from "./resumen/MemberHomeDashboard";

export type ResumenTabProps = {
  model: ResumenViewModel;
  actions: ResumenActions;
};

/** Composición visual del resumen; toda la lógica llega precalculada. */
export default function ResumenTab({ model, actions }: ResumenTabProps) {
  return (
    <div className="xg-tab-in">
      <MemberHomeDashboard model={model} actions={actions} />
    </div>
  );
}
