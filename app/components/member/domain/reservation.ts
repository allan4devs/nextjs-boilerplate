export type Reservation = {
  reserved: number;
  capacity: number;
  remaining: number;
  isMine: boolean;
};

export type ReservationState = Record<string, Reservation>;
