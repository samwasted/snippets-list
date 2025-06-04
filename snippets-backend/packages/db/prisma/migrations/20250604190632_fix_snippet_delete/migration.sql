-- DropForeignKey
ALTER TABLE "Snippet" DROP CONSTRAINT "Snippet_spaceId_fkey";

-- AddForeignKey
ALTER TABLE "Snippet" ADD CONSTRAINT "Snippet_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
