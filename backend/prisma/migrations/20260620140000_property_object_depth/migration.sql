-- AlterTable: erweiterte Objektdaten am Property (Capital Layer / Mappe)
ALTER TABLE "Property" ADD COLUMN "yearBuilt" INTEGER;
ALTER TABLE "Property" ADD COLUMN "condition" "BuildingCondition";
ALTER TABLE "Property" ADD COLUMN "energyClass" "EnergyClass";
ALTER TABLE "Property" ADD COLUMN "units" INTEGER;
