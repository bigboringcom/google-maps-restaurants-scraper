import { Actor } from 'apify';

await Actor.init();

// Define the niche for this specific actor (e.g. "Restaurants")
// In the cloned actors, this will be replaced with the actual niche string.
const NICHE = "Restaurants";

const input = (await Actor.getInput()) || {};
const locations = input.locations || ["New York, USA"];
const maxItems = input.maxItems || 100;

console.log(`Starting Google Maps Scraper for ${NICHE} in locations: ${locations.join(', ')}`);

// Create the search terms by combining niche and locations
const searchStringsArray = locations.map(loc => `${NICHE} in ${loc}`);

// Prepare the input for the official compass/google-maps-scraper
const mapsInput = {
    searchStringsArray: searchStringsArray,
    maxCrawledPlacesPerSearch: maxItems,
    language: "en",
    maxImages: 1, // Minimize extra costs
    maxReviews: 0,
    scrapeReviewerName: false,
    scrapeReviewerId: false,
    scrapeReviewerUrl: false,
    scrapeReviewId: false,
    scrapeReviewUrl: false,
    scrapeResponseFromOwnerText: false,
    // Add graceful kill switch timeout logic internally if supported by the actor, but compass/google-maps-scraper handles limits well.
};

console.log(`Calling compass/google-maps-scraper with input:`, mapsInput);

const run = await Actor.call('compass/google-maps-scraper', mapsInput);

console.log(`Google Maps scraper finished. Run ID: ${run.id}. Status: ${run.status}`);

if (run.status === 'SUCCEEDED') {
    const datasetId = run.defaultDatasetId;
    console.log(`Fetching results from dataset: ${datasetId}`);
    
    // Fetch the dataset items
    const dataset = await Actor.apifyClient.dataset(datasetId);
    const { items } = await dataset.listItems();
    
    console.log(`Retrieved ${items.length} items. Saving to default dataset...`);
    
    // We only need basic fields for a local directory style output
    const cleanItems = items.map(item => ({
        name: item.title,
        phone: item.phone,
        address: item.address,
        website: item.website,
        url: item.url,
        rating: item.totalScore,
        reviewsCount: item.reviewsCount,
        category: item.categoryName,
        location: {
            lat: item.location?.lat,
            lng: item.location?.lng
        }
    }));
    
    await Actor.pushData(cleanItems);
    console.log('Successfully saved to default dataset.');
} else {
    console.error('Google Maps Scraper failed!');
}

await Actor.exit();
