export type Reservation = {
  reserved: number;
  capacity: number;
  remaining: number;
  isMine: boolean;
  status?: string;
  enabled?: boolean;
};

export type ReservationState = Record<string, Reservation>;
