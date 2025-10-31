ALTER TABLE `stories` ADD `seriesId` varchar(64);--> statement-breakpoint
ALTER TABLE `stories` ADD `chapterNumber` int;--> statement-breakpoint
ALTER TABLE `stories` ADD `previousChapterId` int;