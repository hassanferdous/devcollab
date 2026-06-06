import { useCallback, useEffect, useRef } from "react";

export const useDebounce = () => {
	const ref = useRef<NodeJS.Timeout | null>(null);

	const debouncedFn = useCallback(
		<T = unknown>(debouncedFn: (value?: T) => void, ms: number) => {
			return (value: T) => {
				if (ref.current) clearTimeout(ref.current);
				ref.current = setTimeout(() => debouncedFn(value), ms);
			};
		},
		[],
	);

	const cleanUp = useCallback(() => {
		if (ref.current) clearTimeout(ref.current);
	}, []);

	useEffect(() => {
		return () => cleanUp();
	}, [cleanUp]);

	return { debouncedFn };
};
