import { GumboSubclause } from "../../generated/ast";
import { metamodelOf } from "../metamodel";
import "./gumbo-membership";
import { GumboMembershipMeta } from "./gumbo-membership";

@metamodelOf(GumboSubclause)
export class GumboSubclauseMeta extends GumboMembershipMeta {
    override ast(): GumboSubclause {
        return this._ast as GumboSubclause;
    }
}

declare module "../../generated/ast" {
    interface GumboSubclause {
        $meta: GumboSubclauseMeta;
    }
}
