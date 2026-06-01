import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import { seedContent } from "./seed.js";

const prisma = new PrismaClient();
const json = (value: unknown) => value as InputJsonValue;

async function main() {
  for (const world of seedContent.world_packs) {
    await prisma.worldPack.upsert({
      where: { worldId: world.world_id },
      update: {
        name: world.name,
        summary: world.summary,
        rulesJson: json(world.rules_json),
        status: world.status
      },
      create: {
        worldId: world.world_id,
        name: world.name,
        summary: world.summary,
        rulesJson: json(world.rules_json),
        status: world.status
      }
    });
  }

  for (const event of seedContent.event_cards) {
    await prisma.eventCard.upsert({
      where: { eventId: event.event_id },
      update: {
        worldId: event.world_id,
        title: event.title,
        triggerJson: json(event.trigger_json),
        tagsJson: json(event.tags_json),
        promptStub: event.prompt_stub,
        outcomeTemplates: json(event.outcome_templates),
        deathLinksJson: json(event.death_links_json),
        weight: event.weight,
        status: event.status
      },
      create: {
        eventId: event.event_id,
        worldId: event.world_id,
        title: event.title,
        triggerJson: json(event.trigger_json),
        tagsJson: json(event.tags_json),
        promptStub: event.prompt_stub,
        outcomeTemplates: json(event.outcome_templates),
        deathLinksJson: json(event.death_links_json),
        weight: event.weight,
        status: event.status
      }
    });
  }

  for (const death of seedContent.death_cards) {
    await prisma.deathCard.upsert({
      where: { deathId: death.death_id },
      update: {
        title: death.title,
        triggerJson: json(death.trigger_json),
        description: death.description,
        settlementHook: death.settlement_hook,
        status: death.status
      },
      create: {
        deathId: death.death_id,
        title: death.title,
        triggerJson: json(death.trigger_json),
        description: death.description,
        settlementHook: death.settlement_hook,
        status: death.status
      }
    });
  }

  for (const talent of seedContent.talents) {
    await prisma.talent.upsert({
      where: { talentId: talent.talent_id },
      update: {
        name: talent.name,
        rarity: talent.rarity,
        capacityCost: talent.capacity_cost,
        effectJson: json(talent.effect_json),
        unlockConditionJson: json(talent.unlock_condition_json),
        status: talent.status
      },
      create: {
        talentId: talent.talent_id,
        name: talent.name,
        rarity: talent.rarity,
        capacityCost: talent.capacity_cost,
        effectJson: json(talent.effect_json),
        unlockConditionJson: json(talent.unlock_condition_json),
        status: talent.status
      }
    });
  }

  for (const achievement of seedContent.achievements) {
    await prisma.achievement.upsert({
      where: { achievementId: achievement.achievement_id },
      update: {
        name: achievement.name,
        description: achievement.description,
        conditionJson: json(achievement.condition_json),
        status: achievement.status
      },
      create: {
        achievementId: achievement.achievement_id,
        name: achievement.name,
        description: achievement.description,
        conditionJson: json(achievement.condition_json),
        status: achievement.status
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("seed content imported");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
