import { commentPersistWorker } from "@/domains/v1/comment/worker";
import logger from "@/lib/logger";

export async function startWorkers() {
	const batch = Promise.all([commentPersistWorker.startConsuming()]);
	try {
		await batch;
		logger.info("[RabbitMQ] Started all batch workers successfully");
	} catch (error) {
		logger.error(
			"[RabbitMQ] Failed to start comment persist worker:",
			error
		);
	}
}
