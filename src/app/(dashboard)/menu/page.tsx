import dbConnect from "@/lib/mongoose";
import MenuEntry from "@/models/MenuEntry";
import MenuClient from "@/components/MenuClient";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
    await dbConnect();
    const menuItems = await MenuEntry.find().lean().sort({ createdAt: -1 });

    // Serialize MongoDB objects
    const serializedItems = menuItems.map(item => ({
        ...item,
        _id: item._id.toString(),
    }));

    return <MenuClient initialMenuItems={serializedItems} />;
}
