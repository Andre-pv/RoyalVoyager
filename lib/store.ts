import { create } from 'zustand';

// ─── Store Types ──────────────────────────────────────────────────────────────
interface BookingState {
  // ── Booking ───────────────────────────────────────────────────────────────
  selectedCruiseId: string | null;
  selectedRoom: string | null;
  guestCount: number;
  bookingDraft: any; 
  
  setCruise:       (id: string)        => void;
  setRoom:         (roomId: string)    => void;
  setGuests:       (count: number)     => void;
  setBookingDraft: (draft: any)        => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  // ── Booking defaults ──────────────────────────────────────────────────────
  selectedCruiseId: null,
  selectedRoom:     null,
  guestCount:       2,
  bookingDraft:     {},

  setCruise: (id)        => set({ selectedCruiseId: id }),
  setRoom:   (roomId)    => set({ selectedRoom: roomId }),
  setGuests: (count)     => set({ guestCount: count }),
  setBookingDraft: (draft) => set({ bookingDraft: draft }),
}));
