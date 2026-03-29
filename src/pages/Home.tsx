import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Problem from '@/components/Problem';
import Solution from '@/components/Solution';
import HowItWorks from '@/components/HowItWorks';
import Benefits from '@/components/Benefits';
import Preview from '@/components/Preview';
import Waitlist from '@/components/Waitlist';
import Footer from '@/components/Footer';

const Home = () => {
    return (
        <div className="min-h-screen bg-[#f7f7f7] text-gray-900">
            <Header />
            <Hero />
            <Problem />
            <Solution />
            <HowItWorks />
            <Benefits />
            <Preview />
            <Waitlist />
            <Footer />
        </div>
    );
};

export default Home;
