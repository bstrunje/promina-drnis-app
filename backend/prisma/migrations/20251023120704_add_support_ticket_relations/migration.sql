-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "system_manager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "system_manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_responses" ADD CONSTRAINT "ticket_responses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "system_manager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
