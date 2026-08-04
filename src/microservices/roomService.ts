import { RoomBooking } from './types';

// Mock Room Bookings Database
const BOOKINGS_DB: RoomBooking[] = [
  {
    bookingId: 'bk_101',
    userId: 'usr_student_01',
    userName: 'Alice Smith',
    buildingId: 'bldg_cs',
    roomId: 'room_201',
    timeSlot: 'Wed 10:00-12:00',
    purpose: 'Group Study for AI Project',
    createdAt: '2026-08-01T09:00:00Z',
    status: 'ACTIVE'
  },
  {
    bookingId: 'bk_102',
    userId: 'usr_student_02',
    userName: 'Bob Jones',
    buildingId: 'bldg_eng',
    roomId: 'room_105',
    timeSlot: 'Fri 14:00-16:00',
    purpose: 'Circuit Design Workshop',
    createdAt: '2026-08-02T10:30:00Z',
    status: 'ACTIVE'
  }
];

const AVAILABLE_ROOMS = [
  { buildingId: 'bldg_cs', roomId: 'room_201', capacity: 6, hasProjector: true },
  { buildingId: 'bldg_cs', roomId: 'room_202', capacity: 10, hasProjector: true },
  { buildingId: 'bldg_cs', roomId: 'room_203', capacity: 4, hasProjector: false },
  { buildingId: 'bldg_eng', roomId: 'room_105', capacity: 8, hasProjector: true },
  { buildingId: 'bldg_eng', roomId: 'room_106', capacity: 12, hasProjector: true }
];

export class RoomService {
  public static searchAvailableRooms(buildingId: string, timeSlot: string) {
    const occupiedRoomIds = BOOKINGS_DB
      .filter(b => b.buildingId === buildingId && b.timeSlot === timeSlot && b.status === 'ACTIVE')
      .map(b => b.roomId);

    const available = AVAILABLE_ROOMS.filter(r => r.buildingId === buildingId && !occupiedRoomIds.includes(r.roomId));
    return { success: true, buildingId, timeSlot, availableRooms: available };
  }

  public static bookRoom(userId: string, userName: string, buildingId: string, roomId: string, timeSlot: string, purpose: string) {
    const isOccupied = BOOKINGS_DB.some(
      b => b.buildingId === buildingId && b.roomId === roomId && b.timeSlot === timeSlot && b.status === 'ACTIVE'
    );

    if (isOccupied) {
      return { success: false, error: `Room '${roomId}' in '${buildingId}' is already booked for '${timeSlot}'.` };
    }

    const newBooking: RoomBooking = {
      bookingId: `bk_${Date.now().toString().slice(-4)}`,
      userId,
      userName,
      buildingId,
      roomId,
      timeSlot,
      purpose,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    };

    BOOKINGS_DB.push(newBooking);
    return { success: true, booking: newBooking };
  }

  public static cancelBooking(bookingId: string) {
    const booking = BOOKINGS_DB.find(b => b.bookingId === bookingId);
    if (!booking) {
      return { success: false, error: `Booking ID '${bookingId}' not found.` };
    }

    if (booking.status === 'CANCELLED') {
      return { success: false, error: `Booking ID '${bookingId}' is already cancelled.` };
    }

    booking.status = 'CANCELLED';
    return { success: true, bookingId, status: 'CANCELLED', rawBooking: booking };
  }

  public static getBooking(bookingId: string): RoomBooking | undefined {
    return BOOKINGS_DB.find(b => b.bookingId === bookingId);
  }

  public static getAllBookings(): RoomBooking[] {
    return BOOKINGS_DB;
  }
}
