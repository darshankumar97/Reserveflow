import { notFound } from "next/navigation";

import { Header } from "@/components/layout/header";
import { ReservationDetailClient } from "@/components/reservations/reservation-detail-client";
import { getReservationById } from "@/lib/data/reservation";
import { ReservationNotFoundError } from "@/lib/services/reservation";

type ReservationPageProps = {
  params: Promise<{ id: string }>;
};

async function loadReservation(id: string) {
  try {
    return await getReservationById(id);
  } catch (error) {
    if (error instanceof ReservationNotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function ReservationDetailPage({
  params,
}: ReservationPageProps) {
  const { id } = await params;
  const reservation = await loadReservation(id);

  return (
    <>
      <Header
        title="Reservation"
        description="Review, confirm, or cancel this stock hold."
      />
      <ReservationDetailClient initial={reservation} />
    </>
  );
}
