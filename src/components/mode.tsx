import Card from "./card.astro";

export default function Mode () {

    return (
        <div className="flex justify-center items-center">
            <button className="bg-[#111111] hover:bg-purple-600 border p-1 cursor-pointer hover:scale-95 rounded-lg select-none duration-200 transition-all">
                    MODE
            </button>
        </div>
    )
}