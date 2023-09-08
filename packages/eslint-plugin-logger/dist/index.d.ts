import type { TSESLint } from '@typescript-eslint/utils';
export declare const rules: Record<string, {
    meta: {
        type: string;
    };
    create: TSESLint.RuleModule<string>['create'];
}>;
