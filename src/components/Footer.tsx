import React from "react";
import { MoveRight, Github, Linkedin, Mail } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
    const currentYear = new Date().getFullYear();

    const containerVariants = {
        hidden: { opacity: 0, y: 50, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1] as const,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1] as const
            }
        }
    };

    return (
        <footer className="w-full p-4 pt-0 text-neutral-600 dark:text-neutral-400 font-sans">
            <motion.div
                id="main-footer"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                className="w-full max-w-[1400px] mx-auto rounded-3xl border bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20 data-[theme=light]:!bg-[#dbeafe] data-[theme=light]:!border-[#93c5fd] overflow-hidden footer-transition"
            >
                <motion.div variants={itemVariants} className="p-8 md:p-12 border-b border-neutral-200 dark:border-white/10 data-[theme=light]:border-[#93c5fd] footer-transition">
                    <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-neutral-900 dark:text-white uppercase footer-transition whitespace-nowrap">
                        Let's Connect
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2">

                    <motion.div variants={itemVariants} className="p-8 md:p-12 flex flex-col justify-between gap-8 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-white/10 data-[theme=light]:border-[#93c5fd] overflow-hidden footer-transition">
                        <div>
                            <a
                                href="mailto:nikshaan06@gmail.com"
                                className="group flex items-center gap-2 md:gap-4 text-base min-[370px]:text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 whitespace-nowrap footer-transition"
                            >
                                nikshaan06@gmail.com
                                <span className="bg-neutral-900 dark:bg-white text-white dark:text-black p-2 rounded-full group-hover:rotate-[-45deg] footer-transform-transition flex-shrink-0 footer-transition">
                                    <MoveRight className="w-3 h-3 md:w-5 md:h-5" />
                                </span>
                            </a>
                        </div>

                        <div className="flex gap-2">
                            <a
                                href="https://github.com/Nikshaan"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Visit Nikshaan's GitHub profile"
                                className="p-4 rounded-full border border-neutral-200 dark:border-white/10 data-[theme=light]:border-[#93c5fd] hover:bg-neutral-200 dark:hover:bg-white/10 data-[theme=light]:hover:bg-blue-100 footer-transition"
                            >
                                <Github className="w-5 h-5 text-neutral-900 dark:text-white" aria-hidden="true" />
                            </a>
                            <a
                                href="https://www.linkedin.com/in/nikshaan-shetty/"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Connect with Nikshaan on LinkedIn"
                                className="p-4 rounded-full border border-neutral-200 dark:border-white/10 data-[theme=light]:border-[#93c5fd] hover:bg-neutral-200 dark:hover:bg-white/10 data-[theme=light]:hover:bg-blue-100 footer-transition"
                            >
                                <Linkedin className="w-5 h-5 text-neutral-900 dark:text-white" aria-hidden="true" />
                            </a>
                            <a
                                href="mailto:nikshaan06@gmail.com"
                                aria-label="Send an email to Nikshaan"
                                className="p-4 rounded-full border border-neutral-200 dark:border-white/10 data-[theme=light]:border-[#93c5fd] hover:bg-neutral-200 dark:hover:bg-white/10 data-[theme=light]:hover:bg-blue-100 footer-transition"
                            >
                                <Mail className="w-5 h-5 text-neutral-900 dark:text-white" aria-hidden="true" />
                            </a>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="p-6 md:p-12 flex flex-col justify-between gap-8">
                        <div className="flex flex-col gap-2">
                            <p className="text-base font-medium text-neutral-600 dark:text-neutral-400 data-[theme=light]:text-blue-900/70 mb-2">
                                Navigation
                            </p>
                            <nav aria-label="Footer navigation" className="flex flex-wrap gap-2 md:gap-3">
                                {[
                                    { name: "me", href: "/#me" },
                                    { name: "projects", href: "#projects" },
                                    { name: "fun stuff", href: "/#fun" }
                                ].map((link) => (
                                    <a
                                        key={link.name}
                                        href={link.href}
                                        aria-label={`Navigate to ${link.name} section`}
                                        className="px-4 md:px-6 py-2 rounded-full border border-neutral-200 dark:border-white/10 data-[theme=light]:border-[#93c5fd] text-sm md:text-base text-neutral-900 dark:text-white font-medium hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-black data-[theme=light]:hover:bg-blue-600 data-[theme=light]:hover:text-white footer-transition"
                                    >
                                        {link.name}
                                    </a>
                                ))}
                            </nav>
                        </div>

                        <div className="flex flex-row flex-wrap justify-between items-center gap-x-4 gap-y-2">
                            <p className="text-xs md:text-sm font-medium text-neutral-500 dark:text-neutral-500">
                                &copy; {currentYear} Nikshaan Shetty.
                            </p>
                            <div className="text-xs md:text-sm font-medium text-neutral-500 dark:text-neutral-500 flex items-center gap-1">
                                <span>Built with</span>
                                <span className="text-neutral-900 dark:text-white">Astro</span>
                                <span className="text-neutral-300 dark:text-neutral-700">/</span>
                                <span className="text-neutral-900 dark:text-white">React</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </footer>
    );
};

export default Footer;
