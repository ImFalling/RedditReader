/* GLOBAL FUNCTIONS */

//Fetches feed through a *SYNCHRONOUS* AJAX request, based on subreddit name (string), post count (number), and which ID was last or first fetched (string).
function fetchFeed(subreddit, count, after, before) {
    //Ensures the parameters have values
    if (subreddit != null && count != null && count <= linkLimit) {

        //If no starting point is specified, set "after" and "before" to be empty strings.
        if (after == null) after = "";
        if (before == null) before = "";

        //Initialize output object.
        var output = {};

        //Fetch the JSON.
        $.ajax({
            url: "https://www.reddit.com/r/" + subreddit + ".json",
            async: false,
            data: {
                limit: count,
                after: after,
                before: before
            },
            success: function (data) {
                output = data;
            }
        });
        RawFeed = output;
        return output;
    } else
        console.error("Invalid Parameters");
}

//Parses the raw, fetched Reddit JSON into a more managable JSON syntax.
function parseFeed(rawFeed) {
    //Initialize the returnable array of posts.
    var returnable = [];

    //Iterate through the fetched links with a jQuery forEach loop.
    $.each(rawFeed.data.children, function (i, e) {
        //Easy accessor.
        var ctx = e.data;

        //Make sure the post isn't a sticked post. We're not interested in stickied posts, and they aren't affected by the limit count.
        if (ctx.stickied)
            return true;

        //Initialize a post object.
        var post = new redditPost();

        //Detemine the type of post.
        ctx.is_self ? post.type = 0 : post.type = 1;

        //Assign the object some values.
        post.title = ctx.title;
        post.author = ctx.author;
        post.comments = ctx.num_comments;
        if (ctx.is_self)
            post.content = ctx.selftext;
        else
            post.content = ctx.url;
        post.createdDate = new Date(ctx.created * 1000).toDateString();
        post.score = ctx.score;
        post.thumbnail = ctx.thumbnail;
        post.url = "http://www.reddit.com" + ctx.permalink;
        post.id = ctx.name;

        //Push the object to the return array.
        returnable.push(post);
    });

    //Return the finished array
    ParsedFeed = returnable;
    return returnable;
}

//Button event
function newFetch() {
    //Empty the list of links
    $("#postList").empty();

    //Check if we're fetching data from a new subreddit.
    if ($(".redditName").val().toLowerCase() != reddit) {
        reddit = $(".redditName").val().toLowerCase();
    }

    //Repopulate the list
    populateList(parseFeed(fetchFeed(reddit, $(".numberPosts").val())));
}

//Populates the div with readable elements.
function populateList(parsedFeed) {
    //Make sure we actually got any posts back.
    if (parsedFeed[0] != null) {
        //Assign the marker variables the first and last ID's of the list of links.
        beforeID = parsedFeed[0].id;
        afterID = parsedFeed[parsedFeed.length - 1].id;

        //For each post in the parsed array...
        $.each(parsedFeed, function (i, e) {
            //Clone the HTML template
            var post = $(".postTemplate").clone();

            //Remove the template attributes.
            post.attr("style", "");
            post.attr("class", "postLink");

            //Fill the element with values.
            post.find(".thumbnail").attr("src", e.thumbnail);
            post.find(".title").html(e.title);
            post.find(".author").html("by: " + e.author);
            post.find(".score").html(e.score + " points");
            post.find(".comments").html(e.comments + " comments");
            post.find(".date").html(e.createdDate);
            post.find(".commentLink").attr("href", e.url);
            post.find(".inspectLink").click(function (i) {
                inspectLink(post.clone(), e);
            });
            //Determine if the thumbnail should be clickable to reach the source
            if (e.type == 1)
                post.find(".contentLink").attr("href", e.content);
            else
                post.find(".thumbnail").attr("src", "self.png");

            //Append the new element to the post list.
            post.appendTo("#postList");
        });
    } else {
        alert("No more posts!");
    }

}

//Page Control
function previousPage() {
    $("#postList").empty();
    populateList(parseFeed(fetchFeed(reddit, $(".numberPosts").val(), null, beforeID)));
}

function nextPage() {
    $("#postList").empty();
    populateList(parseFeed(fetchFeed(reddit, $(".numberPosts").val(), afterID, null)));
}

//Inspect Post
function inspectLink(element, postObject) {
    $("body").css("margin-left", "-100vw");
    $("#postReader").find(".postLink").replaceWith($(element));
    if (postObject.type == 0){
        $("#postReader").find("p").css("display", "block");
        $("#postReader").find("p").html(postObject.content);
        $("#postReader").find(".preview").css("display", "none");
    }
    else{
        $("#postReader").find(".preview").css("display", "block");
        $("#postReader").find("img").attr("src", postObject.content);
        $("#postReader").find("p").css("display", "none");
    }
    console.log(fetchComments(postObject));
}

//Uninspect Post
function back(){
    $("body").css("margin-left", "0"); 
}

//Fetch Comments
function fetchComments(postObject) {
    var output = "";
    //Fetch the JSON.
    $.ajax({
        url: postObject.url + ".json",
        async: false,
        success: function (data) {
            output = data;
        }
    });
    return output;
}

/* EOS */

/* OBJECT CONSTRUCTORS */

function redditPost() {
    this.title = "";
    //Key to easily determine if the post is an image or a selfpost (0 = self, 1 = link)
    this.type = 0;
    this.content = null;
    this.createdDate = "";
    this.author = "";
    this.score = 0;
    this.comments = 0;
    this.url = "";
    this.thumbnail = "";
    this.id = "";
}

/* EOS */

/* GLOBAL VARIABLES */

//Hard limit for amount of links that can be fetched, to prevent overloading.
const linkLimit = 100;

//Current Subreddit
var reddit = "";

//Keep track of the ID of the first, and last post to be fetched.
var beforeID = "";
var afterID = "";

//Variable for containing the most recent, raw JSON feed.
var RawFeed = {};

//Varaible for containing the most recent, parsed JSON feed.
var ParsedFeed = [];

/* EOS */