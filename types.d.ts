export interface PropertyMeta<TValue> {
    name: string;
    display: string;
    default: TValue
    type: "string" | "number" | "boolean"
}

export interface ObjectMeta {
    properties: PropertyMeta<unknown>[];
}

export type InputParams = Record<string, unknown>;

export interface TaskNode {
    args?: string[];
    parent: TaskNode | null;
    label: string;
    description?: string;
    inputMeta?: ObjectMeta;
    input?: InputParams;
    tasks?: TaskNode[];
    fn?: () => Promise<void>;
}