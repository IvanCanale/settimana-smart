-- 009_fix_ai_added_by.sql
-- Fix: catalog-recipes function previously used added_by='ai_job' instead of 'ai'.
-- The base-tier filter in fetchRecipes uses neq('added_by','ai'), so recipes with
-- added_by='ai_job' were incorrectly visible to base tier users.
-- This migration reclassifies all existing AI-generated recipes to use added_by='ai'.
UPDATE recipes SET added_by = 'ai' WHERE added_by = 'ai_job';
