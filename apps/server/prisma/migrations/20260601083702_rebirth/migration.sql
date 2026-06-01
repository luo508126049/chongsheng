-- CreateTable
CREATE TABLE `users` (
    `user_id` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `channel` VARCHAR(32) NOT NULL DEFAULT 'web_h5',
    `memory_balance` INTEGER NOT NULL DEFAULT 0,
    `rebirth_count` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `runs` (
    `run_id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `world_id` VARCHAR(64) NOT NULL,
    `status` ENUM('active', 'ended') NOT NULL DEFAULT 'active',
    `state_json` JSON NOT NULL,
    `selected_talents` JSON NOT NULL,
    `memory_summary` TEXT NOT NULL,
    `turn_index` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `runs_user_id_status_idx`(`user_id`, `status`),
    PRIMARY KEY (`run_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `run_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `run_id` VARCHAR(64) NOT NULL,
    `idx` INTEGER NOT NULL,
    `role` VARCHAR(16) NOT NULL,
    `content` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `run_messages_run_id_idx_key`(`run_id`, `idx`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settlements` (
    `settlement_id` VARCHAR(64) NOT NULL,
    `run_id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `description` TEXT NOT NULL,
    `survived_age` INTEGER NOT NULL,
    `memory_reward` INTEGER NOT NULL,
    `unlocked_payload` JSON NOT NULL,
    `report_json` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `settlements_run_id_key`(`run_id`),
    INDEX `settlements_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`settlement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `world_packs` (
    `world_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `summary` TEXT NOT NULL,
    `rules_json` JSON NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'enabled',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`world_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_cards` (
    `event_id` VARCHAR(64) NOT NULL,
    `world_id` VARCHAR(64) NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `trigger_json` JSON NOT NULL,
    `tags_json` JSON NOT NULL,
    `prompt_stub` TEXT NOT NULL,
    `outcome_templates` JSON NOT NULL,
    `death_links_json` JSON NOT NULL,
    `weight` INTEGER NOT NULL DEFAULT 10,
    `status` VARCHAR(16) NOT NULL DEFAULT 'enabled',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `event_cards_world_id_status_idx`(`world_id`, `status`),
    PRIMARY KEY (`event_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `death_cards` (
    `death_id` VARCHAR(64) NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `trigger_json` JSON NOT NULL,
    `description` TEXT NOT NULL,
    `settlement_hook` TEXT NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'enabled',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`death_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `talents` (
    `talent_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `rarity` VARCHAR(16) NOT NULL,
    `capacity_cost` INTEGER NOT NULL DEFAULT 1,
    `effect_json` JSON NOT NULL,
    `unlock_condition_json` JSON NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'enabled',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`talent_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_talents` (
    `user_id` VARCHAR(64) NOT NULL,
    `talent_id` VARCHAR(64) NOT NULL,
    `unlocked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`user_id`, `talent_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `achievements` (
    `achievement_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `description` TEXT NOT NULL,
    `condition_json` JSON NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'enabled',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`achievement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_achievements` (
    `user_id` VARCHAR(64) NOT NULL,
    `achievement_id` VARCHAR(64) NOT NULL,
    `unlocked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`user_id`, `achievement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telemetry_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(64) NULL,
    `run_id` VARCHAR(64) NULL,
    `name` VARCHAR(64) NOT NULL,
    `payload` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `telemetry_events_name_created_at_idx`(`name`, `created_at`),
    INDEX `telemetry_events_run_id_idx`(`run_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_users` (
    `admin_id` VARCHAR(64) NOT NULL,
    `username` VARCHAR(64) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_users_username_key`(`username`),
    PRIMARY KEY (`admin_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `runs` ADD CONSTRAINT `runs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `run_messages` ADD CONSTRAINT `run_messages_run_id_fkey` FOREIGN KEY (`run_id`) REFERENCES `runs`(`run_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settlements` ADD CONSTRAINT `settlements_run_id_fkey` FOREIGN KEY (`run_id`) REFERENCES `runs`(`run_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_talents` ADD CONSTRAINT `user_talents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_talents` ADD CONSTRAINT `user_talents_talent_id_fkey` FOREIGN KEY (`talent_id`) REFERENCES `talents`(`talent_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_achievement_id_fkey` FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`achievement_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
