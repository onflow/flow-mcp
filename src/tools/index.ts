import { flowBalanceTool } from "./flowBalance/index.js";
import { tokenBalanceTool } from "./tokenBalance/index.js";
import { coaAccountTool } from "./coaAccount/index.js";
import { getContractTool } from "./getContract/index.js";
import { accountInfoTool } from "./accountInfo/index.js";
import type { ToolRegistration } from "../types.js";

// biome-ignore lint/suspicious/noExplicitAny: Any is fine here because all tools validate their input schemas.
export const createTools = (): ToolRegistration<any>[] => {
	return [
		flowBalanceTool,
		tokenBalanceTool,
		coaAccountTool,
		getContractTool,
		accountInfoTool,
	];
};

export default createTools;