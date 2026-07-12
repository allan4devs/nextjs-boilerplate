import type { ReservationState } from "../domain/reservation";

export type ReservationsResponse = {
  date: string;
  reservations: ReservationState;
  error?: string;
};

export type ReservationMutationResponse = ReservationsResponse & {
  code?: string;
  paymentRequired?: boolean;
  checkoutOptionId?: string;
};
