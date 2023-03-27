/********************************************************************************
 * Copyright (c) 2022-2023 Sensmetry UAB and others
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License, v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is
 * available at https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { Diagnostic } from "vscode-languageserver";
import { parseSysML, TEST_BUILD_OPTIONS } from "../../../../testing";
import * as ast from "../../../generated/ast";
import { SysMLBuildOptions } from "../../shared/workspace/document-builder";

const BUILD_OPTIONS: SysMLBuildOptions = { ...TEST_BUILD_OPTIONS, validationChecks: "all" };

export async function expectValidations(
    text: string,
    messages: unknown[] = [],
    ignore?: (d: Diagnostic) => boolean
): Promise<void> {
    const result = await parseSysML(text, BUILD_OPTIONS);
    const diagnostics = result.diagnostics.filter(
        (d) =>
            !/metamodel|linking/.test(String(d.code ?? "")) && (ignore?.call(undefined, d) ?? true)
    );
    expect(diagnostics).toMatchObject(messages.map((m) => expect.objectContaining({ message: m })));
}

describe("Usage validation", () => {
    test("variants owned by non-variations trigger validation", async () => {
        return expectValidations("part def P { part P : P; variant P; }", [
            expect.stringMatching("not owned by a variation"),
        ]);
    });

    test("variations with non-variant members trigger validation", async () => {
        return expectValidations("variation part def P { part p : P; }", [
            expect.stringMatching("Variation can only own"),
        ]);
    });
});

describe("Attribute usage validation", () => {
    test("Attribute usages typed by non-datatypes trigger validation", async () => {
        return expectValidations("part def P; attribute a : P;", [
            expect.stringMatching("must be typed"),
        ]);
    });
});

describe("Enumeration usage validation", () => {
    test("implicit typing doesn't trigger validation", async () => {
        return expectValidations(`
            attribute def Color;
            enum def ColorKind :> Color {           
                enum red;
            }`);
    });

    test("implicit typing from value doesn't trigger validation", async () => {
        return expectValidations(`
            attribute def Color;
            enum def ColorKind :> Color {           
                enum red;
            }
            enum color = ColorKind::red;`);
    });

    test("more than one typing triggers validation", async () => {
        return expectValidations("enum def E; part def P; enum e : E, P;", [
            expect.stringMatching("must be typed by exactly one EnumerationDefinition"),
            expect.stringMatching("must be typed by DataType"),
        ]);
    });

    test("usages typed by non-enum defs trigger validation", async () => {
        return expectValidations("attribute def P; enum e : P;", [
            expect.stringMatching("must be typed by exactly one EnumerationDefinition"),
        ]);
    });
});

describe.each([
    [ast.OccurrenceUsage, "occurrence", ast.Class],
    [ast.ItemUsage, "item", ast.Structure],
    [ast.PartUsage, "part", ast.Structure],
    [ast.ActionUsage, "action", ast.Behavior],
    [ast.ConnectionUsage, "connection", ast.Association],
    [ast.FlowConnectionUsage, "flow", ast.Interaction],
    [ast.InterfaceUsage, "interface", ast.InterfaceDefinition],
    [ast.AllocationUsage, "allocation", ast.AllocationDefinition],
    [ast.PortUsage, "port", ast.PortDefinition],
    [ast.StateUsage, "state", ast.Behavior],
])("%s validation", (_, kw, supertype) => {
    test(`usages typed by non-${supertype} trigger validation`, async () => {
        return expectValidations(`attribute def C; ${kw} p : C;`, [
            expect.stringMatching(`must be typed by ${supertype}`),
        ]);
    });
});

describe.each([
    [ast.ConstraintUsage, "constraint", ast.Predicate],
    [ast.CalculationUsage, "calc", ast.SysMLFunction],
    [ast.CaseUsage, "case", ast.CaseDefinition],
    [ast.AnalysisCaseUsage, "analysis", ast.AnalysisCaseDefinition],
    [ast.VerificationCaseUsage, "verification", ast.VerificationCaseDefinition],
    [ast.UseCaseUsage, "use case", ast.UseCaseDefinition],
    [ast.RequirementUsage, "requirement", ast.RequirementDefinition],
    [ast.ViewUsage, "view", ast.ViewDefinition],
    [ast.ViewpointUsage, "viewpoint", ast.ViewpointDefinition],
    [ast.RenderingUsage, "rendering", ast.RenderingDefinition],
])("%s validation", (_, kw, supertype) => {
    test(`usages typed by non-${supertype} trigger validation`, async () => {
        return expectValidations(`attribute def C; ${kw} p : C;`, [
            expect.stringMatching(`must be typed by exactly one ${supertype}`),
        ]);
    });

    test(`usages typed by multiple ${supertype} trigger validation`, async () => {
        return expectValidations(`${kw} def C; ${kw} def D; ${kw} p : C, D;`, [
            expect.stringMatching(`must be typed by exactly one ${supertype}`),
        ]);
    });
});

describe("PartUsage validation", () => {
    test("usages not typed by part defs trigger validation", async () => {
        return expectValidations("item def C; part p : C;", [
            expect.stringMatching("must be typed by at least one PartDef"),
        ]);
    });
});

describe("Individual occurrence usage validation", () => {
    test("usages typed by non-individual occurrence definitions trigger validation", async () => {
        return expectValidations("occurrence def C; individual occurrence p : C;", [
            expect.stringMatching("must be typed by exactly one individual OccurrenceDefinition"),
        ]);
    });

    test("usages typed by multiple individual occurrence definitions trigger validation", async () => {
        return expectValidations(
            "individual occurrence def C; individual occurrence def D; individual occurrence p : C, D;",
            [expect.stringMatching("must be typed by exactly one individual OccurrenceDefinition")]
        );
    });
});

describe.each([
    [ast.ViewDefinition, "view def", "rendering", ast.RenderingUsage],
    [ast.ViewUsage, "view", "rendering", ast.RenderingUsage],
    [ast.StateUsage, "state", "do action", "do subaction"],
    [ast.StateUsage, "state", "entry action", "entry subaction"],
    [ast.StateUsage, "state", "exit action", "exit subaction"],
    [ast.StateDefinition, "state def", "do action", "do subaction"],
    [ast.StateDefinition, "state def", "entry action", "entry subaction"],
    [ast.StateDefinition, "state def", "exit action", "exit subaction"],
])("%s member validations", (_, owner, member, msg) => {
    test(`multiple ${msg} members trigger validation`, () => {
        return expectValidations(
            `${owner} A {
        ${member} a;
        ${member} b;
    }`,
            [
                expect.stringMatching(`most one ${msg} is allowed`),
                expect.stringMatching(`most one ${msg} is allowed`),
            ],
            (d) => !/typed/.test(d.message)
        );
    });
});

describe("Flow connection definition ends", () => {
    test("more than 2 ends trigger validation", async () => {
        return expectValidations("flow def F { end item a; end item b; end item c; }", [
            expect.stringMatching(/At most 2 end features/),
            expect.stringMatching(/At most 2 end features/),
            expect.stringMatching(/At most 2 end features/),
        ]);
    });

    test("2 ends don't trigger validation", async () => {
        return expectValidations("flow def F { end item a; end item b; }");
    });
});

describe("Interface ends", () => {
    test.each(["", "def"])("non-port usage ends trigger validation", async (kw) => {
        return expectValidations(`interface ${kw} I { end item a; }`, [
            expect.stringMatching(/must be a port/),
        ]);
    });
});

test.each([
    [ast.SubjectMembership, "subject"],
    [ast.ObjectiveMembership, "objective"],
])("More than one %s triggers a validation", async (_, kw) => {
    return expectValidations(
        `case def R { ${kw} a; ${kw} b; }`,
        [expect.stringContaining("At most one"), expect.stringContaining("At most one")],
        (d) => !/typed/.test(d.message)
    );
});

test("Requirement verification membership triggers validation if it not owned by the objective of a verification case", async () => {
    return expectValidations(
        "requirement def R { verify requirement r; }",
        [expect.stringMatching("must be owned by")],
        (d) => !/typed/.test(d.message)
    );
});

describe("Send action usage validation", () => {
    test("no sender and receiver trigger a validation", async () => {
        return expectValidations("action def A { send 1; }", [
            expect.stringMatching("must have at least either"),
        ]);
    });

    test("port receiver triggers a validation", async () => {
        return expectValidations("action def A { port a; send 1 to a; }", [
            expect.stringMatching("Sending to a port"),
        ]);
    });

    test("port receiver triggers a validation (chain)", async () => {
        return expectValidations("action def A { item a { port b; } send 1 to a.b; }", [
            expect.stringMatching("Sending to a port"),
        ]);
    });
});

describe("Parallel states", () => {
    test("succession triggers a validation", async () => {
        return expectValidations("state def S parallel { state a; then a; }", [
            expect.stringMatching("Parallel state"),
        ]);
    });

    test("transition usage triggers a validation", async () => {
        return expectValidations("state def S parallel { state a; transition then a; }", [
            expect.stringMatching("Parallel state"),
        ]);
    });
});

describe("Quantity expressions", () => {
    test("non-measurement references trigger validation", async () => {
        return expectValidations("attribute a = 1 [0];", [
            expect.stringMatching("Invalid quantity expression"),
        ]);
    });
});
