import { chatPersistWorker } from "@/domains/v1/chat/worker";
import logger from "@/lib/logger";

export async function startWorkers() {
	const batch = Promise.all([chatPersistWorker.startConsuming()]);
	try {
		await batch;
		logger.info("[RabbitMQ] Started all batch workers successfully");
	} catch (error) {
		logger.error("[RabbitMQ] Failed to start chat persist worker:", error);
	}
}
