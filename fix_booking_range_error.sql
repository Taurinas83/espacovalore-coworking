-- Fix the double booking function to use 'tstzrange' (for timestamp with time zone) instead of 'tsrange'
create or replace function public.check_double_booking()
returns trigger as $$
begin
  if exists (
    select 1 from public.bookings
    where room_id = new.room_id
    and id <> new.id -- exclude self on update
    and tstzrange(start_time, end_time) && tstzrange(new.start_time, new.end_time)
  ) then
    raise exception 'Room is already booked for this time slot';
  end if;
  return new;
end;
$$ language plpgsql;
