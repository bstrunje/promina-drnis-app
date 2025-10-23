-- CreateTable
CREATE TABLE "system_manager_trusted_devices" (
    "id" SERIAL NOT NULL,
    "system_manager_id" INTEGER NOT NULL,
    "device_hash" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(100),
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(6),

    CONSTRAINT "system_manager_trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_manager_trusted_devices_system_manager_id_idx" ON "system_manager_trusted_devices"("system_manager_id");

-- CreateIndex
CREATE INDEX "system_manager_trusted_devices_expires_at_idx" ON "system_manager_trusted_devices"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "system_manager_trusted_devices_system_manager_id_device_has_key" ON "system_manager_trusted_devices"("system_manager_id", "device_hash");

-- AddForeignKey
ALTER TABLE "system_manager_trusted_devices" ADD CONSTRAINT "system_manager_trusted_devices_system_manager_id_fkey" FOREIGN KEY ("system_manager_id") REFERENCES "system_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
