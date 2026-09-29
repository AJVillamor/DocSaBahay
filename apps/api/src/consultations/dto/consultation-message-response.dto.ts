/**
 * Response shape of every `/consultations/:appointmentId/messages` endpoint.
 * Structurally mirrors `@doksabahay/shared`'s `consultationMessageSchema`.
 */
export interface ConsultationMessageResponseDto {
  id: string;
  appointmentId: string;
  senderId: string;
  body: string;
  createdAt: string;
}
