-- Last guard against double booking, whatever code path writes: two confirmed bookings never overlap.
CREATE TRIGGER `bookings_no_overlap_insert`
BEFORE INSERT ON `bookings`
WHEN NEW.`status` = 'confirmed' AND EXISTS (
  SELECT 1 FROM `bookings`
  WHERE `status` = 'confirmed' AND `starts_at` < NEW.`ends_at` AND `ends_at` > NEW.`starts_at`
)
BEGIN
  SELECT RAISE(ABORT, 'booking_overlap');
END;
--> statement-breakpoint
CREATE TRIGGER `bookings_no_overlap_update`
BEFORE UPDATE OF `status`, `starts_at`, `ends_at` ON `bookings`
WHEN NEW.`status` = 'confirmed' AND EXISTS (
  SELECT 1 FROM `bookings`
  WHERE `id` <> NEW.`id` AND `status` = 'confirmed'
    AND `starts_at` < NEW.`ends_at` AND `ends_at` > NEW.`starts_at`
)
BEGIN
  SELECT RAISE(ABORT, 'booking_overlap');
END;
