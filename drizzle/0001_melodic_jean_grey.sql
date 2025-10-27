CREATE TABLE `agentLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ritualId` varchar(64) NOT NULL,
	`agentName` varchar(64) NOT NULL,
	`agentSymbol` varchar(8) NOT NULL,
	`role` varchar(128) NOT NULL,
	`content` text NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`title` varchar(255) NOT NULL,
	`prompt` text NOT NULL,
	`content` text NOT NULL,
	`ritualId` varchar(64) NOT NULL,
	`wordCount` int NOT NULL,
	`qualityScore` int NOT NULL,
	`ethicalApproval` int NOT NULL DEFAULT 1,
	`ucfHarmony` int NOT NULL,
	`ucfPrana` int NOT NULL,
	`ucfDrishti` int NOT NULL,
	`ucfKlesha` int NOT NULL,
	`ucfResilience` int NOT NULL,
	`ucfZoom` int NOT NULL,
	`agentContributions` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stories_id` PRIMARY KEY(`id`),
	CONSTRAINT `stories_ritualId_unique` UNIQUE(`ritualId`)
);
--> statement-breakpoint
CREATE TABLE `ucfStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ritualId` varchar(64) NOT NULL,
	`step` int NOT NULL,
	`harmony` int NOT NULL,
	`prana` int NOT NULL,
	`drishti` int NOT NULL,
	`klesha` int NOT NULL,
	`resilience` int NOT NULL,
	`zoom` int NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ucfStates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `stories` ADD CONSTRAINT `stories_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;