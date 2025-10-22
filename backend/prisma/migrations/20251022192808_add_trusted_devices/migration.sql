-- CreateTable
CREATE TABLE "trusted_devices" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "device_hash" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(100),
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(6),

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trusted_devices_organization_id_member_id_idx" ON "trusted_devices"("organization_id", "member_id");

-- CreateIndex
CREATE INDEX "trusted_devices_expires_at_idx" ON "trusted_devices"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "trusted_devices_organization_id_member_id_device_hash_key" ON "trusted_devices"("organization_id", "member_id", "device_hash");

-- AddForeignKey
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;
