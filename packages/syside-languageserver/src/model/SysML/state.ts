import { State } from "../../generated/ast";
import { metamodelOf } from "../metamodel";
import "./gumbo-membership";
import { GumboMembershipMeta } from "./gumbo-membership";

@metamodelOf(State)
export class StateMeta extends GumboMembershipMeta {
    override ast(): State {
        return this._ast as State;
    }
}

declare module "../../generated/ast" {
    interface State {
        $meta: StateMeta;
    }
}
