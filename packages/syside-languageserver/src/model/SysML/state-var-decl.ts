import { StateVarDecl } from "../../generated/ast";
import { metamodelOf } from "../metamodel";
import "./gumbo-membership";
import { GumboMembershipMeta } from "./gumbo-membership";

@metamodelOf(StateVarDecl)
export class StateVarDeclMeta extends GumboMembershipMeta {
    override ast(): StateVarDecl {
        return this._ast as StateVarDecl;
    }
}

declare module "../../generated/ast" {
    interface StateVarDecl {
        $meta: StateVarDeclMeta;
    }
}
