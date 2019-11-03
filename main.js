const Apify = require('apify');

Apify.main(async () => {
    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest({ url: 'https://www.allrecipes.com/recipes/1031/main-dish/sandwiches/beef/', userData: { label: 'list' } });

    const crawler = new Apify.CheerioCrawler({
        requestQueue,

        requestTimeoutSecs: 120,
        handlePageTimeoutSecs: 240,
        maxConcurrency: 5,

        handlePageFunction: async ({ request, $ }) => {
            console.log(request.url);
            if (request.userData.label === 'list') {
                const itemLinks = $('.fixed-recipe-card > .fixed-recipe-card__info > a');
                if (itemLinks.length === 0) {
                    return;
                }

                for (let index = 0; index < itemLinks.length; index++) {
                    const itemUrl = $(itemLinks[index]).attr('href');
                    if (itemUrl) {
                        await requestQueue.addRequest({ url: `${itemUrl}`, userData: { label: 'item' } });
                    }
                }

                const nextPageUrl = $('link[rel=next]').attr('href');
                console.log('nextPageUrl=' + nextPageUrl);
                await requestQueue.addRequest({ url: `${nextPageUrl}`, userData: { label: 'list' } });
            } else if (request.userData.label === 'item') {
                const pageResult = {
                    url: request.url,
                    name: $('#recipe-main-content').text(),
                    rating: $('meta[itemprop=ratingValue]').attr('content'),
                    ratingcount: $('meta[itemprop=reviewCount]').attr('content'),
                    ingredients: $('.checklist').text(),
                    prep: $('[itemprop=prepTime]').text(),
                    cook: $('[itemprop=cookTime]').text(),
                    ready: $('[itemprop=totalTime]').text(),
                    Calories: $('.nutrition-summary-facts').text(),
                    '#debug': Apify.utils.createRequestDebugInfo(request),
                };

                await Apify.pushData(pageResult);
            }
        },

        handleFailedRequestFunction: async ({ request }) => {
            await Apify.pushData({
                '#isFailed': true,
                '#debug': Apify.utils.createRequestDebugInfo(request),
            });
        },
    });

    await crawler.run();
});
