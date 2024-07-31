import { metamodelOf } from "../metamodel";
import { GumboMembershipMeta } from "./gumbo-membership";
import { SpecSection } from "../../generated/ast";

@metamodelOf(SpecSection)
export class SpecSectionMeta extends GumboMembershipMeta {
    override ast(): SpecSection {
        return this._ast as SpecSection;
    }
}

declare module "../../generated/ast" {
    interface SpecSection {
        $meta: SpecSectionMeta;
    }
}
