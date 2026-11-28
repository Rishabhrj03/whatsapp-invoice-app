import { verifyResetToken } from "@/app/actions/auth";
import ResetPasswordClient from "@/components/ResetPasswordClient";

export const metadata = {
    title: "Reset Password | Primebake",
    description: "Securely reset your Primebake account password.",
};

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string; email?: string }>;
}) {
    const resolvedParams = await searchParams;
    const token = resolvedParams.token || "";
    const email = resolvedParams.email || "";

    const verification = await verifyResetToken(email, token);

    return (
        <ResetPasswordClient
            initialEmail={email}
            initialToken={token}
            isTokenValid={verification.valid}
            tokenError={verification.error}
        />
    );
}
