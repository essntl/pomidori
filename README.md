------------------------

#Description:

The project is a Pomodoro timer in HTML, CSS and JS. It has the basic functions of a timer, pause/unpause, reset, set work and break time. Most of my time went into styling and making sure the animations were fluid and colors matched the theme. The standout "features" is a candle which is lit up once the timer is running and the whole site changes styling accordingly, paired with a progress bar, progress circle? The outline of the circle is the progress bar yeah.

#What was used:

As mentioned above HTML, CSS and JS was used. For the images, since im unfortunately not an artist, I asked ChatGPT to generate me some, I later edited them a bit in Photoshop to change some colors and remove backgrounds. For the candle I honestly didn't want to deal with building svgs so I asked Claude to make that for me. The logic for it and other elements animations and styling along with all the rest of the code was made by me.

#How it was made:

Before starting to build I looked for inspiration so I knew what layout to aim for. I like using transparent containers in a mix with gradients, which well is also noticable by my portfolio, so that's where i got the main idea from. I also asked GPT for a rough layout but that was pretty pointless because I kinda knew what to make already. It helped with chosing colors at the start but I later swapped them out with my own once the candle idea came to my head. For the code I started with first making the HTMl file with CSS so I had things to manipulate, can't really write code to affect elements if there are none to affect. Instead of creating the circle like it was shown in the tutorial i decided for an svg since its easier to manipulate and scale and this also allowed me to make a progress ring/bar. 

#What went wrong:

Since I didn't lay out a plan for what goes where my initial code wasn't organized in a way which would make it easy to add new things. So I got confused sometimes and had to debug errors which could have been avoided with better planning and structure. Other than that it was pretty straight forward. One example of this is the styleChange function was put in the wrong order of operations in resetTimer and other places which made it not work as intended.

#Future improvements:

There are so many ideas I want to implement here. As you might've noticed if you've looked at the page, there is talk about notes and calendar. Those are the two things I will add next after polishing what I have now. For notes im thinking of making a whiteboard type container where you can drag notes around and organize ideas how you see fit. There is also adding more pomodoro type of things like ambient sounds, integration with youtube and whatever other music platforms. Once im at that point I think it wouldn't be insane to make some sort of account system to store settings accorss sessions and devices. I need this kind of tool myself so i'll add anything that comes to mind.

#What I learned:

As obvious as it is, you need to plan better and split things into smaller problems. Prior to doing the course I couldn't really wrap my head around code at all but I understood that it's just a lot of small logical operations that combine into something massive over time. Even if you think down to how machines work, it's all a bunch of true/false switches so of course coding will be similar to that. 


------------------------
