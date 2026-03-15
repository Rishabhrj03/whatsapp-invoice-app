import dbConnect from "./src/lib/mongoose";
import User from "./src/models/User";

async function run() {
    try {
        await dbConnect();
        const users = await User.find({});
        console.log("DB_USERS:", JSON.stringify(users.map(u => ({
            email: u.email,
            businessName: u.businessName,
            whatsappTemplate: u.whatsappTemplate
        })), null, 2));
        process.exit(0);
    } catch (e) {
        console.error("DB Fetch Error:", e);
        process.exit(1);
    }
}

run();
