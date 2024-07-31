import { GumboMembership } from "../../generated/ast";
import { MembershipMeta } from "../KerML";
import { metamodelOf } from "../metamodel";

@metamodelOf(GumboMembership)
export abstract class GumboMembershipMeta extends MembershipMeta {
    override ast(): GumboMembership {
        return this._ast as GumboMembership;
    }
}

declare module "../../generated/ast" {
    interface GumboMembership {
        $meta: GumboMembershipMeta;
    }
}
